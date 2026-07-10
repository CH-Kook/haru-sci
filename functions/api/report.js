// Cloudflare Pages Function: POST /api/report
// 앱에서 올라온 문제/이야기 신고를 Discord 웹훅으로 전달한다.
// DISCORD_WEBHOOK_URL은 Cloudflare Pages 대시보드의 환경 변수(시크릿)로만 설정하며
// 저장소에는 절대 커밋하지 않는다.

function clip(s, max) {
  return typeof s === 'string' ? s.slice(0, max) : '';
}

export async function onRequestPost({ request, env }) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  const { type, id, title, reason, day } = body || {};
  if ((type !== 'question' && type !== 'story') || !id) {
    return json({ ok: false, error: 'invalid payload' }, 400);
  }

  const webhook = env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return json({ ok: false, error: 'report channel not configured' }, 500);
  }

  const label = type === 'question' ? '문제' : '이야기';
  const lines = [
    `**[하루사이 신고] ${label}**`,
    `id: \`${clip(id, 120)}\``,
    title ? `내용: ${clip(title, 300)}` : null,
    `사유: ${reason ? clip(reason, 500) : '(미입력)'}`,
    `day: ${Number.isFinite(day) ? day : '?'}`,
  ].filter(Boolean);

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: clip(lines.join('\n'), 1900) }),
  });

  if (!res.ok) {
    return json({ ok: false, error: 'webhook failed' }, 502);
  }
  return json({ ok: true }, 200);
}
