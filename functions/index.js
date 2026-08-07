// ══════════════════════════════════════════════════════════════
//  네아로(네이버 아이디로 로그인) → Firebase 커스텀 토큰 브리지
//
//  흐름:
//   1) 브라우저가 네이버 인가(authorize)로 이동 → redirect_uri = 이 함수 URL
//   2) 이 함수가 인가코드(code) → 접근토큰(access_token) 교환 (Client Secret 사용, 서버 전용)
//   3) 접근토큰으로 네이버 프로필 조회 (/v1/nid/me, CORS 때문에 서버에서만 가능)
//   4) uid = "naver:<네이버id>" 로 Firebase 커스텀 토큰 발급
//   5) 사이트로 되돌리며 URL fragment(#)로 토큰 전달 → 브라우저가 signInWithCustomToken
//
//  비밀값(NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)은 functions/.env 에 두며 커밋하지 않습니다.
// ══════════════════════════════════════════════════════════════
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

// 배포 리전 (1세대 → 함수 URL이 예측 가능: https://asia-northeast3-manseayuk.cloudfunctions.net/naverCallback)
const REGION = 'asia-northeast3';
// 로그인 성공 후 되돌아갈 공개 사이트 주소
const SITE = 'https://ksoh777-droid.github.io/ManSeaYuk1/';

// 관리자 페이지에 접근할 수 있는 구글 계정 (여러 명 가능)
const ADMIN_EMAILS = ['ksoh777@gmail.com'];

exports.naverCallback = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    const CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
    try {
      if (!CLIENT_ID || !CLIENT_SECRET) {
        res.status(500).send('서버에 네이버 Client ID/Secret 이 설정되지 않았습니다.');
        return;
      }
      const code = req.query.code;
      const state = req.query.state || '';
      const naverError = req.query.error;
      if (naverError) {
        res.redirect(SITE + '#naver&error=' + encodeURIComponent(req.query.error_description || naverError));
        return;
      }
      if (!code) { res.status(400).send('인가코드(code)가 없습니다.'); return; }

      // 1) 인가코드 → 접근토큰
      const tokenUrl = 'https://nid.naver.com/oauth2.0/token'
        + '?grant_type=authorization_code'
        + '&client_id=' + encodeURIComponent(CLIENT_ID)
        + '&client_secret=' + encodeURIComponent(CLIENT_SECRET)
        + '&code=' + encodeURIComponent(code)
        + '&state=' + encodeURIComponent(state);
      const tokenResp = await fetch(tokenUrl);
      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        res.status(400).send('접근토큰 발급 실패: ' + JSON.stringify(tokenData));
        return;
      }

      // 2) 프로필 조회
      const meResp = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: 'Bearer ' + tokenData.access_token }
      });
      const me = await meResp.json();
      if (me.resultcode !== '00' || !me.response) {
        res.status(400).send('프로필 조회 실패: ' + JSON.stringify(me));
        return;
      }
      const p = me.response;
      const uid = 'naver:' + p.id;
      const name = p.name || p.nickname || '네이버 사용자';
      const photo = p.profile_image || '';

      // 3) Firebase 커스텀 토큰 발급 (uid 규칙: naver:<id> → Firestore 규칙과 그대로 호환)
      const customToken = await admin.auth().createCustomToken(uid, {
        provider: 'naver',
        name: name,
        email: p.email || '',
        picture: photo
      });

      // 4) 사이트로 되돌리며 토큰 전달 (fragment는 서버로 전송되지 않음)
      const frag = new URLSearchParams({ token: customToken, name: name, photo: photo }).toString();
      res.redirect(SITE + '#naver&' + frag);
    } catch (e) {
      res.status(500).send('네이버 로그인 처리 오류: ' + ((e && e.message) || e));
    }
  });

// ══════════════════════════════════════════════════════════════
//  관리자 전용: 전체 회원 목록 + 저장 데이터 조회 (onCall)
//   - 호출자의 Firebase 인증 토큰을 서버에서 검증하여 관리자만 허용
//   - Admin SDK 로 Authentication 사용자 목록 + Firestore users 컬렉션을 합쳐 반환
// ══════════════════════════════════════════════════════════════
exports.adminListMembers = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const email = (context.auth.token && context.auth.token.email) || '';
    if (!ADMIN_EMAILS.includes(email)) {
      throw new functions.https.HttpsError('permission-denied', '관리자만 접근할 수 있습니다.');
    }

    // 1) Authentication 회원 목록 (페이지네이션으로 전체 수집)
    const members = [];
    let pageToken;
    do {
      const res = await admin.auth().listUsers(1000, pageToken);
      res.users.forEach((u) => {
        const isNaver = u.uid.indexOf('naver:') === 0;
        members.push({
          uid: u.uid,
          email: u.email || '',
          name: u.displayName || '',
          photo: u.photoURL || '',
          provider: isNaver ? 'naver' : ((u.providerData[0] && u.providerData[0].providerId) || 'unknown'),
          created: u.metadata.creationTime || '',
          lastLogin: u.metadata.lastSignInTime || ''
        });
      });
      pageToken = res.pageToken;
    } while (pageToken);

    // 2) Firestore 저장 데이터 (users 컬렉션)
    const byUid = {};
    const snap = await admin.firestore().collection('users').get();
    snap.forEach((doc) => {
      const d = doc.data() || {};
      const profiles = d.profiles || {};
      byUid[doc.id] = {
        count: Object.keys(profiles).length,
        names: Object.keys(profiles),
        profiles: profiles,
        updatedAt: d.updatedAt || null
      };
    });

    // 3) 병합 (가입일 최신순 정렬)
    members.forEach((m) => { m.saved = byUid[m.uid] || { count: 0, names: [], profiles: {}, updatedAt: null }; });
    members.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return { members: members, total: members.length, generatedAt: Date.now() };
  });
