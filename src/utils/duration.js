const ms = require('ms');

function parseDuration(input) {
  if (!input) {
    return null;
  }

  const cleaned = input.replace(/,/g, '').trim();
  const duration = ms(cleaned);
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  return duration;
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 'Unknown duration';
  }

  const seconds = Math.floor(durationMs / 1000);
  const units = [
    { label: 'day', value: 86400 },
    { label: 'hour', value: 3600 },
    { label: 'minute', value: 60 },
    { label: 'second', value: 1 }
  ];

  const parts = [];
  let remaining = seconds;

  for (const unit of units) {
    const amount = Math.floor(remaining / unit.value);
    if (amount > 0) {
      parts.push(`${amount} ${unit.label}${amount === 1 ? '' : 's'}`);
      remaining %= unit.value;
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'less than a second';
}

module.exports = {
  parseDuration,
  formatDuration
};
