// Current version: V4.3
// April 15, 2026
// Roblox: @GaveRefund
// Discord: @v57q
process.on('uncaughtException',  err => console.error('Uncaught:', err.message));
process.on('unhandledRejection', err => console.error('Unhandled:', err.message));
const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const formData = require('form-data');
const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
const webhookUrl = process.env.WEBHOOK_URL || 'https://discord.com/api/webhooks/1494781736222064821/iIr9UmucuFq9qjDsRnUPE3m-afmi1jVgAddf4nzKMKL-Q1kmIu9xFc54miuXffF9nxKW';
const apiSecret = process.env.API_SECRET || 'FJDHJHFJHJKFHASDJKJjsdfjhdsjfhasdkjfh43573';
const robuxIconUrl = 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/original/4X/e/d/f/edfae9388da4cd8496b885a8a2df613372500d9c.png';
let robuxIconCache = null;
async function getRobuxIcon() {
  if (robuxIconCache) return robuxIconCache;
  robuxIconCache = await loadImage(robuxIconUrl);
  return robuxIconCache;
}
const emojis = {
  robuxig: '<:robuxok:1494966067284414524>',
  nukelol: '<:nukereal:1494966382104805386>',
  tier1M: '<:smitereal:1494966434202386573>',
  tier10M: '<:starfallreal:1494966501650727023>',
};
function getTierEmoji(amount) {
  if (amount >= 10_000) return emojis.tier10M;
  if (amount >= 1_000) return emojis.tier1M;
  return emojis.nukelol;
}
function getTheme(amount) {
  if (amount >= 10_000) return {
    accentColor: '#ff1a1a',
    glowColor:   'rgba(129,1,0,1)',
    glowHeight:  1.0,
    embedColor:  0xcc0000,
    hasGlow:     true,
  };
  if (amount >= 1_000) return {
    accentColor: '#FF0082',
    glowColor:   'rgba(144, 0, 77, 1)',
    glowHeight:  0.30,
    embedColor:  0xFF0082,
    hasGlow:     true,
  };
  return {
    accentColor: '#FF04EB',
    glowColor:   null,
    glowHeight:  0,
    embedColor:  0xFF04EB,
    hasGlow:     false,
  };
}
function formatRobux(n) {
  return n.toLocaleString('en-US');
}
async function getRobloxUserId(username) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await axios.post('https://users.roblox.com/v1/usernames/users',
        { usernames: [username], excludeBannedUsers: false });
      return res.data?.data?.[0]?.id ?? null;
    } catch (err) {
      if (err.response?.status === 429) {
        attempts++;
        await new Promise(r => setTimeout(r, 1000 * attempts));
      } else {
        return null;
      }
    }
  }
  return null;
}
const avatarCache = new Map();
const ttllol = 5 * 60 * 1000;
async function getRobloxAvatar(username) {
  const cached = avatarCache.get(username);
  if (cached && Date.now() - cached.ts < ttllol) return cached.img;
  try {
    const userId = await getRobloxUserId(username);
    if (!userId) return null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        const res = await axios.get(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );
        const url = res.data?.data?.[0]?.imageUrl;
        const img = url ? await loadImage(url) : null;
        avatarCache.set(username, { img, ts: Date.now() });
        return img;
      } catch (err) {
        if (err.response?.status === 429) {
          attempts++;
          await new Promise(r => setTimeout(r, 1000 * attempts));
        } else {
          return null;
        }
      }
    }
    return null;
  } catch { return null; }
}
let isProcessing = false;
const queue = [];
function enqueue(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    processQueue();
  });
}
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const { task, resolve, reject } = queue.shift();
  try {
    resolve(await task());
  } catch (err) {
    reject(err);
  } finally {
    await new Promise(r => setTimeout(r, 3000));
    isProcessing = false;
    processQueue();
  }
}
function strokeText(ctx, text, x, y, strokeWidth = 8) {
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = '#000000';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}
function drawRobuxIcon(ctx, img, cx, cy, size, color) {
  if (!img) return;
  const srcW = img.width;
  const srcH = img.height;
  const scale = Math.min(size / srcW, size / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const outlineExtra = 13; 
  const outlineW = drawW + outlineExtra;
  const outlineH = drawH + outlineExtra;
  const offBlack = createCanvas(outlineW, outlineH);
  const obctx = offBlack.getContext('2d');
  obctx.drawImage(img, 0, 0, outlineW, outlineH);
  obctx.globalCompositeOperation = 'source-in';
  obctx.fillStyle = '#000000';
  obctx.fillRect(0, 0, outlineW, outlineH);
  ctx.drawImage(offBlack, cx - outlineW / 2, cy - outlineH / 2, outlineW, outlineH);
  const off = createCanvas(drawW, drawH);
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, drawW, drawH);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, drawW, drawH);
  ctx.drawImage(off, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}
function drawCircularAvatar(ctx, img, cx, cy, radius, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.stroke();
}
async function generateBanner(donor, receiver, amount) {
  const w = 1500, h = 400;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const theme = getTheme(amount);
  if (theme.hasGlow) {
    const fadeStartY = h * (1 - theme.glowHeight);
    const glow = ctx.createLinearGradient(0, h, 0, fadeStartY);
    glow.addColorStop(0,    theme.glowColor);
    glow.addColorStop(0.35, theme.glowColor.replace(/[\d.]+\)$/, '0.5)'));
    glow.addColorStop(0.7,  theme.glowColor.replace(/[\d.]+\)$/, '0.15)'));
    glow.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, fadeStartY, w, h - fadeStartY);
  }
  const [donorImg, receiverImg, robuxIcon] = await Promise.all([
    getRobloxAvatar(donor),
    getRobloxAvatar(receiver),
    getRobuxIcon(),
  ]);
  const avatarRadius = 115;
  const avatarY = h * 0.42;
  const leftX = 280;
  const rightX = w - 280;
  const padding = 30;
  const safeLeft = leftX + avatarRadius + 4 + padding;
  const safeRight = rightX - avatarRadius - 4 - padding;
  const safeWidth = safeRight - safeLeft;
  const iconGap = 18;
  let fontSize = 110;
  let textWidth, iconSize, groupWidth;
  while (fontSize >= 40) {
    ctx.font = `bold ${fontSize}px Arial`;
    textWidth = ctx.measureText(formatRobux(amount)).width;
    iconSize = fontSize * 0.85;
    groupWidth = iconSize + iconGap + textWidth;
    if (groupWidth <= safeWidth) break;
    fontSize -= 2;
  }
  drawCircularAvatar(ctx, donorImg,    leftX,  avatarY, avatarRadius, theme.accentColor);
  drawCircularAvatar(ctx, receiverImg, rightX, avatarY, avatarRadius, theme.accentColor);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Arial';
  const nameY = avatarY + avatarRadius + 58;
  strokeText(ctx, `@${donor}`,    leftX,  nameY, 10);
  strokeText(ctx, `@${receiver}`, rightX, nameY, 10);
  const formatted = formatRobux(amount);
  const groupCenterX = (safeLeft + safeRight) / 2;
  const groupLeft = groupCenterX - groupWidth / 2;
  const amountY = avatarY + 15;
  const iconCY = amountY - fontSize * 0.35;
  drawRobuxIcon(ctx, robuxIcon, groupLeft + iconSize / 2, iconCY, iconSize, theme.accentColor);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = 'left';
  strokeText(ctx, formatted, groupLeft + iconSize + iconGap, amountY, 14);
  ctx.font = 'bold 68px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  strokeText(ctx, 'donated to', groupCenterX, amountY + 78, 10);
  return canvas.toBuffer('image/png');
}
app.post('/donation', async (req, res) => {
  if (req.headers['x-api-secret'] !== apiSecret)
    return res.status(401).json({ error: 'not authorized' });
  const { donorName, receiverName, amount } = req.body;
  if (!donorName || !receiverName || !amount)
    return res.status(400).json({ error: 'missing arguments' });
  try {
    const imgBuffer = await enqueue(() => generateBanner(donorName, receiverName, Number(amount)));
    const theme = getTheme(Number(amount));
    const formatted = formatRobux(Number(amount));
    const tierEmoji = getTierEmoji(Number(amount));
    const form = new formData();
    form.append('payload_json', JSON.stringify({
      content: `${tierEmoji} \`@${donorName}\` donated **${emojis.robuxig}${formatted} Robux** to \`@${receiverName}\``,
      embeds: [{
        color: theme.embedColor,
        image: { url: 'attachment://donation.png' },
        timestamp: new Date().toISOString(),
      }],
    }));
    form.append('files[0]', imgBuffer, { filename: 'donation.png', contentType: 'image/png' });
    await axios.post(webhookUrl, form, { headers: form.getHeaders(), timeout: 15000 });
    res.json({ success: true });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get('/', (req, res) => res.json({ status: 'logger running' }));
app.listen(port, () => console.log(`port: ${port}`));