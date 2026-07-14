// Cloudflare Pages Function: /api/backup
// 기기 간 진도 이동용 임시 코드 저장소. KV에 짧게(10분) 저장했다가
// 다른 기기에서 코드를 입력해 가져가면 즉시 삭제한다.
// 필요한 바인딩: KV 네임스페이스 BACKUP_KV (Pages 프로젝트 설정에서 연결)

const TTL_SECONDS = 600; // 10분
const MAX_BODY_BYTES = 300 * 1024; // 300KB
// 받침 없는 쉬운 음절만 생성: 쌍자음 제외한 초성 14개 x 단순 모음 8개
const SIMPLE_CHO_IDX = [0, 2, 3, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 18]; // 쌍자음 제외
const SIMPLE_JUNG_IDX = [0, 4, 8, 13, 18, 20]; // ㅏㅓㅗㅜㅡㅣ (이중모음 제외)

function randomSyllable() {
  const cho = SIMPLE_CHO_IDX[Math.floor(Math.random() * SIMPLE_CHO_IDX.length)];
  const jung = SIMPLE_JUNG_IDX[Math.floor(Math.random() * SIMPLE_JUNG_IDX.length)];
  const code = 0xac00 + (cho * 21 + jung) * 28; // 종성 0 = 받침 없음
  return String.fromCharCode(code);
}

function generateCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += randomSyllable();
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return s + digits;
}

export async function onRequestPost({ request, env }) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

  if (!env.BACKUP_KV) {
    return json({ ok: false, error: 'backup storage not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  const data = body && body.data;
  if (typeof data !== 'string' || !data.trim()) {
    return json({ ok: false, error: 'no data' }, 400);
  }
  if (new TextEncoder().encode(data).length > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'too large' }, 413);
  }

  let code;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode();
    const existing = await env.BACKUP_KV.get(code);
    if (!existing) break;
  }

  await env.BACKUP_KV.put(code, data, { expirationTtl: TTL_SECONDS });
  return json({ ok: true, code, expiresInSeconds: TTL_SECONDS });
}

export async function onRequestGet({ request, env }) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

  if (!env.BACKUP_KV) {
    return json({ ok: false, error: 'backup storage not configured' }, 500);
  }

  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').trim();
  if (!code) {
    return json({ ok: false, error: 'no code' }, 400);
  }

  const data = await env.BACKUP_KV.get(code);
  if (!data) {
    return json({ ok: false, error: 'not found or expired' }, 404);
  }
  await env.BACKUP_KV.delete(code); // 1회용
  return json({ ok: true, data });
}
