// 만세력 사주 앱 개발 기록 → docx 생성 (표지 이미지 · 목차 · 코드 스니펫 · 스크린샷 프레임 · 페이지번호)
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, Footer, PageNumber, TabStopType, TabStopPosition } from 'docx';
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const ACCENT = '8a1c1c', GOLD = 'b8860b', INK = '2b2420', SUB = '7a6f63';
const NONE = { style: BorderStyle.NONE, size: 0, color: 'ffffff' };

// ── 헬퍼 ──
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
  children: [new TextRun({ text: t, bold: true, color: ACCENT, size: 30 })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 },
  children: [new TextRun({ text: t, bold: true, color: INK, size: 26 })] });
const P = (t) => new Paragraph({ spacing: { after: 90 }, alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, size: 22, color: INK })] });
const BULLET = (t, level = 0) => new Paragraph({ bullet: { level }, spacing: { after: 50 },
  children: [new TextRun({ text: t, size: 22, color: INK })] });
const SPACER = (a = 60) => new Paragraph({ spacing: { after: a }, children: [new TextRun('')] });

// 코드 블록(여러 줄)
const CODEBLOCK = (lines) => new Paragraph({
  spacing: { before: 60, after: 120 }, shading: { type: ShadingType.SOLID, color: '2b2420' },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 6 } },
  children: lines.map((ln, i) => new TextRun({ text: ln || ' ', font: 'Consolas', size: 18, color: 'f3e6c4', break: i === 0 ? 0 : 1 })) });

// 목차 항목 (제목 ... 점선 탭)
const TOCITEM = (num, title, bold = false) => new Paragraph({ spacing: { after: 60 },
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: 'dot' }],
  children: [new TextRun({ text: (num ? num + '  ' : '') + title, size: 22, bold, color: bold ? ACCENT : INK })] });

function table(headers, rows, widths) {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'd8cbb2' };
  const borders = { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
  const headerRow = new TableRow({ tableHeader: true, children: headers.map((h, i) =>
    new TableCell({ width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
      shading: { type: ShadingType.SOLID, color: ACCENT }, margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'ffffff', size: 20 })] })] })) });
  const bodyRows = rows.map((r, i) => new TableRow({ children: r.map((c, j) =>
    new TableCell({ width: widths ? { size: widths[j], type: WidthType.PERCENTAGE } : undefined,
      shading: { type: ShadingType.SOLID, color: i % 2 ? 'faf6ec' : 'ffffff' }, margins: { top: 50, bottom: 50, left: 90, right: 90 },
      children: [new Paragraph({ children: [new TextRun({ text: c, size: 20, color: INK })] })] })) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [headerRow, ...bodyRows] });
}

// 이미지 도판 + 캡션
function figure(buf, w, h, caption) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 20 },
      children: [new ImageRun({ type: 'jpg', data: buf, transformation: { width: w, height: h } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
      children: [new TextRun({ text: caption, italics: true, size: 18, color: SUB })] })
  ];
}

// 스크린샷 자리 프레임 (사용자가 나중에 이미지 삽입)
function placeholder(caption) {
  const dash = { style: BorderStyle.DASHED, size: 6, color: GOLD };
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: dash, bottom: dash, left: dash, right: dash, insideHorizontal: dash, insideVertical: dash },
    rows: [new TableRow({ children: [new TableCell({ shading: { type: ShadingType.SOLID, color: 'fbf7ee' },
      margins: { top: 360, bottom: 360, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '🖼  ' + caption, italics: true, size: 20, color: SUB })] })] })] })] });
}

// ── 대표 이미지 → JPG 변환(문서 삽입용) ──
const heroBig = await sharp('assets/hero.webp').resize({ width: 1100 }).jpeg({ quality: 84 }).toBuffer();

const children = [];

// ══ 표지 ══
children.push(
  new Paragraph({ shading: { type: ShadingType.SOLID, color: ACCENT }, spacing: { before: 400, after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: GOLD } },
    children: [new TextRun({ text: '', size: 8 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 500, after: 60 },
    children: [new TextRun({ text: '만세력 사주 조회 웹앱', bold: true, size: 60, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 },
    children: [new TextRun({ text: '소셜 로그인 · 클라우드 저장 · 관리자 기능 개발 기록', size: 28, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 },
    children: [new TextRun({ text: '萬歲曆 · 1900–2050 · 한국천문연구원(KASI) 기반', size: 20, color: SUB })] }),
  ...figure(heroBig, 460, 307, '그림 0. 대표 이미지(사이트 상단 배너)'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 20 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 8 } },
    children: [new TextRun({ text: '리포지토리  github.com/ksoh777-droid/ManSeaYuk1', size: 20, color: SUB })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
    children: [new TextRun({ text: '공개 사이트  https://ksoh777-droid.github.io/ManSeaYuk1/', size: 20, color: SUB })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
    children: [new TextRun({ text: '작성일  2026-08-07', size: 20, color: SUB })] }),
  new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] })
);

// ══ 목차 ══
children.push(
  new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '목  차', bold: true, size: 36, color: ACCENT })] }),
  TOCITEM('1.', '프로젝트 개요', true),
  TOCITEM('2.', '개발 환경 준비'),
  TOCITEM('', '   2.1 GitHub 연결   2.2 Node.js(포터블)   2.3 빌드 구조'),
  TOCITEM('3.', '로그인·클라우드 저장 (구글)', true),
  TOCITEM('4.', '디자인 개편 · 대표 이미지 최적화', true),
  TOCITEM('5.', '소셜 로그인 확장 (네이버·카카오)', true),
  TOCITEM('', '   5.1 동작 흐름   5.2 함수/비밀값   5.3 IAM   5.4 카카오 KOE 오류'),
  TOCITEM('6.', '관리자 페이지', true),
  TOCITEM('7.', '배포·운영 구조 요약', true),
  TOCITEM('8.', '남은 개선 과제'),
  TOCITEM('부록', '주요 코드 스니펫', true),
  new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] })
);

// ══ 1 ══
children.push(
  H1('1. 프로젝트 개요'),
  P('한국천문연구원(KASI) 기반 만세력(1900~2050) 데이터로 사주팔자를 계산·해석하는 자체완결형 정적 웹앱(GitHub Pages 배포)에, 이번 작업에서 다음 기능을 추가·개선하였다.'),
  BULLET('소셜 로그인 3종(구글·네이버·카카오)과 로그인 계정별 클라우드 저장/불러오기(기기 간 동기화)'),
  BULLET('상단 헤더 디자인 개편(대표 이미지 배너) 및 이미지 용량 최적화'),
  BULLET('사이트 내 관리자 페이지(회원 목록·저장 데이터 조회)'),
  P('정적 사이트 자체에는 서버가 없으므로, 로그인·저장은 Firebase(Authentication + Firestore)로, 네이버·카카오 연동과 관리자 조회는 Firebase Cloud Functions로 구현하였다.')
);

// ══ 2 ══
children.push(
  H1('2. 개발 환경 준비'),
  H2('2.1 GitHub 연결'),
  BULLET('GitHub CLI(gh)를 winget으로 설치하고 브라우저 인증으로 로그인(계정: ksoh777-droid).'),
  BULLET('기존 리포지토리 ManSeaYuk1을 로컬로 클론하여 작업 시작.'),
  H2('2.2 Node.js (포터블)'),
  P('이 PC에는 Node.js가 없었고 관리자 권한(UAC) 문제로 MSI 설치가 불가하여 포터블 버전을 사용하였다. 빌드/배포 전 아래 경로를 PATH에 주입한다.'),
  CODEBLOCK([
    '$env:Path="C:\\Users\\VIEW LIFE\\AppData\\Local\\' ,
    '  nodejs-portable\\node-v24.19.0-win-x64;$env:Path"',
    'node build_html.mjs' ]),
  H2('2.3 빌드 구조'),
  BULLET('소스: saju.template.html → build_html.mjs 가 만세력 데이터와 html2canvas를 주입해 index.html + 사주.html 생성.'),
  BULLET('GitHub Pages는 main 브랜치를 그대로 서빙하므로, 배포하려면 main에 push.')
);

// ══ 3 ══
children.push(
  H1('3. 로그인·클라우드 저장 (구글)'),
  P('앱에는 이미 브라우저 로컬(localStorage) 기반 입력 저장이 있었으나 기기 간 공유가 되지 않았다. 이를 계정별 클라우드 저장으로 확장하였다.'),
  BULLET('Firebase 프로젝트(manseayuk) 생성, 웹 앱 등록, Google 로그인 제공자 활성화, Firestore 생성.'),
  BULLET('저장 구조: Firestore 문서 users/{uid} 의 profiles 필드에 사용자별 입력을 보관.'),
  BULLET('보안 규칙: 각 사용자는 자신의 users/{uid} 문서만 읽기/쓰기 가능.'),
  BULLET('프로필 저장 로직을 "메모리 캐시 + 백엔드 전환" 구조로 리팩터링(로그인 전 로컬 / 후 Firestore).'),
  BULLET('최초 로그인 시, 브라우저에 저장돼 있던 입력을 계정으로 올릴지 확인.'),
  SPACER(),
  placeholder("스크린샷: 로그인 후 헤더(프로필 표시)와 '저장·불러오기' 카드")
);

// ══ 4 ══
children.push(
  H1('4. 디자인 개편 · 대표 이미지 최적화'),
  BULLET('상단 헤더를 로고+제목 → 프리미엄 히어로 → 최종적으로 대표 이미지 배너로 교체.'),
  BULLET('로그인 버튼을 이미지 위에 오버레이, 로그인 후에는 밝은 칩 배경 프로필로 전환.'),
  BULLET('저장·불러오기 카드는 로그인 시에만 노출.'),
  BULLET('대표 이미지 우측 하단에 "萬歲曆 · 1900–2050 · 한국천문연구원(KASI) 기반" 캡션 오버레이.'),
  ...figure(heroBig, 480, 320, '그림 1. 최종 헤더에 사용된 대표 이미지 배너'),
  H2('4.1 대표 이미지 최적화'),
  P('초기 로딩 속도를 위해 sharp로 WebP 변환·리사이즈하였다.'),
  table(['항목', '변환 전', '변환 후'],
    [['형식', 'PNG', 'WebP (품질 82)'],
     ['용량', '약 2,280 KB', '약 119 KB (약 95% 감소)'],
     ['해상도', '1536 × 1024', '1536 × 1024 (동일)']], [34, 33, 33])
);

// ══ 5 ══
children.push(
  H1('5. 소셜 로그인 확장 (네이버·카카오)'),
  P('네이버·카카오는 Firebase 기본 제공자가 아니어서 정적 사이트만으로는 클라우드 저장과 연동할 수 없다. Cloud Functions로 "커스텀 토큰 브리지"를 구축하였다.'),
  H2('5.1 동작 흐름'),
  BULLET('브라우저 → 네이버/카카오 인가 페이지로 이동 (redirect_uri = Cloud Function 주소).'),
  BULLET('Cloud Function이 인가코드 → 접근토큰 교환(Client Secret 사용, 서버 전용).'),
  BULLET('접근토큰으로 프로필 조회(브라우저는 CORS 불가, 서버에서 수행).'),
  BULLET('uid = "naver:<id>" 또는 "kakao:<id>" 로 Firebase 커스텀 토큰 발급.'),
  BULLET('사이트로 되돌리며 URL fragment(#)로 토큰 전달 → signInWithCustomToken 으로 로그인.'),
  BULLET('기존 Firestore 규칙(users/{uid})과 그대로 호환되어 저장/불러오기가 동일하게 동작.'),
  H2('5.2 함수 및 비밀값'),
  BULLET('함수(1세대, asia-northeast3): naverCallback, kakaoCallback — URL이 예측 가능해 콜백 등록이 용이.'),
  BULLET('비밀값은 functions/.env(git 커밋 제외): 네이버 Client ID/Secret, 카카오 REST 키/Client Secret.'),
  BULLET('클라이언트에는 공개 가능한 값(네이버 Client ID, 카카오 REST 키)만 포함.'),
  H2('5.3 필수 IAM 권한'),
  P('커스텀 토큰 서명을 위해 실행 서비스 계정에 "Service Account Token Creator" 역할이 필요하다. 없으면 signBlob 권한 거부 오류가 발생한다.'),
  CODEBLOCK(['계정 : manseayuk@appspot.gserviceaccount.com',
    '역할 : roles/iam.serviceAccountTokenCreator']),
  H2('5.4 카카오 연동 중 발생한 오류와 해결 (KOE)'),
  table(['오류', '의미', '해결'],
    [['KOE004', '앱 관리자 설정(동의항목)', '이메일 등 비즈앱 전용 항목을 필수 동의에서 해제, 닉네임만 필수'],
     ['KOE006', 'Redirect URI 불일치', '카카오 로그인의 Redirect URI 칸에 함수 URL 정확히 등록(사이트 도메인 아님)'],
     ['KOE010', 'Bad client credentials', 'Client Secret "사용함"인데 미전송 → .env에 KAKAO_CLIENT_SECRET 설정 후 재배포']],
    [16, 30, 54]),
  SPACER(),
  placeholder('스크린샷: 헤더의 구글·네이버·카카오 로그인 버튼')
);

// ══ 6 ══
children.push(
  H1('6. 관리자 페이지'),
  P('전체 회원 목록은 클라이언트 SDK로 조회할 수 없어(보안), 관리자 전용 Cloud Function으로 구현하였다.'),
  BULLET('onCall 함수 adminListMembers: 호출자의 인증 토큰을 서버에서 검증해 관리자만 허용.'),
  BULLET('Admin SDK로 Authentication 전체 사용자 + Firestore users 컬렉션을 병합해 반환.'),
  BULLET('관리자 계정: ksoh777@gmail.com (함수와 클라이언트의 ADMIN_EMAILS 일치).'),
  BULLET('admin.html: 통계(전체/구글/네이버/카카오/저장보유) + 회원 표 + 저장 프로필 펼쳐보기.'),
  BULLET('noindex이며 링크 미노출, 비관리자는 서버에서 차단 → URL 노출돼도 안전.'),
  BULLET('메인 헤더에는 관리자 계정 로그인 시에만 "관리자" 링크가 표시.'),
  P('접근 주소: https://ksoh777-droid.github.io/ManSeaYuk1/admin.html'),
  SPACER(),
  placeholder('스크린샷: 관리자 페이지(통계 + 회원 표)')
);

// ══ 7 ══
children.push(
  H1('7. 배포 · 운영 구조 요약'),
  table(['구성요소', '위치 / 값'],
    [['정적 사이트', 'GitHub Pages (main 브랜치, index.html)'],
     ['소스/빌드', 'saju.template.html → build_html.mjs → index.html, 사주.html'],
     ['인증·DB', 'Firebase Authentication + Firestore (프로젝트: manseayuk)'],
     ['서버 함수', 'Cloud Functions(asia-northeast3): naverCallback, kakaoCallback, adminListMembers'],
     ['비밀값', 'functions/.env (git 제외)'],
     ['관리자', 'ksoh777@gmail.com / admin.html'],
     ['소셜 로그인', '구글(네이티브) · 네이버 · 카카오(커스텀 토큰 브리지)']], [26, 74]),
  SPACER(),
  P('※ 보안을 위해 이 문서에는 실제 비밀키(네이버/카카오 Client Secret 등)를 기재하지 않았다. 해당 값은 functions/.env 에만 저장되며 저장소에는 커밋되지 않는다.')
);

// ══ 8 ══
children.push(
  H1('8. 남은 개선 과제'),
  BULLET('네이버·카카오 회원의 이메일을 관리자 화면에 표시(동의항목/함수 보완).'),
  BULLET('헤더의 로그인 버튼 3종 배치·크기 반응형 정리.'),
  BULLET('Cloud Functions 런타임(Node 20 → 상위 버전) 상향으로 지원 종료 경고 제거.')
);

// ══ 부록 : 코드 스니펫 ══
children.push(
  new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [new TextRun('')] }),
  H1('부록. 주요 코드 스니펫'),
  H2('A. Firestore 보안 규칙'),
  CODEBLOCK([
    "match /users/{userId} {",
    "  allow read, write:",
    "    if request.auth != null && request.auth.uid == userId;",
    "}" ]),
  H2('B. 커스텀 토큰 발급 (Cloud Function, 카카오 예시)'),
  CODEBLOCK([
    "const uid = 'kakao:' + me.id;",
    "const customToken = await admin.auth().createCustomToken(uid, {",
    "  provider: 'kakao', name, email: acc.email || '', picture: photo",
    "});",
    "const frag = new URLSearchParams({ token: customToken, name, photo });",
    "res.redirect(SITE + '#kakao&' + frag.toString());" ]),
  H2('C. 클라이언트 — 로그인 시작 & 복귀 처리'),
  CODEBLOCK([
    "// 카카오 인가 페이지로 이동",
    "location.href = 'https://kauth.kakao.com/oauth/authorize'",
    "  + '?response_type=code&client_id=' + KAKAO_REST_API_KEY",
    "  + '&redirect_uri=' + encodeURIComponent(KAKAO_REDIRECT_URI);",
    "",
    "// 되돌아왔을 때: 커스텀 토큰으로 로그인",
    "await signInWithCustomToken(auth, token);",
    "await updateProfile(auth.currentUser,",
    "  { displayName: name, photoURL: photo });" ]),
  H2('D. 프로필 저장 계층 (로컬/클라우드 전환)'),
  CODEBLOCK([
    "function storeProfiles(obj){",
    "  profilesCache = obj;",
    "  if(cloudUser && window.SajuCloud){",
    "    window.SajuCloud.save(obj); return true;   // 클라우드",
    "  }",
    "  return saveLocal(obj);                        // 로컬",
    "}" ]),
  H2('E. 관리자 검증 (adminListMembers)'),
  CODEBLOCK([
    "if(!context.auth)",
    "  throw new functions.https.HttpsError('unauthenticated', ...);",
    "const email = context.auth.token.email || '';",
    "if(!ADMIN_EMAILS.includes(email))",
    "  throw new functions.https.HttpsError('permission-denied',",
    "    '관리자만 접근할 수 있습니다.');" ])
);

const doc = new Document({
  creator: 'ManSeaYuk1', title: '만세력 사주 조회 웹앱 개발 기록',
  styles: { default: { document: { run: { font: 'Malgun Gothic', size: 22, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1100, left: 1100, right: 1100 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ['— ', PageNumber.CURRENT, ' —'], size: 18, color: SUB })] })] }) },
    children
  }]
});

mkdirSync('docs', { recursive: true });
const buf = await Packer.toBuffer(doc);
const out = 'docs/만세력_개발기록.docx';
writeFileSync(out, buf);
console.log('생성 완료:', out, '(' + (buf.length / 1024).toFixed(0) + ' KB)');
