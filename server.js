const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
});

app.use(limiter);

// Logging requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Fallback colors for badge types
const defaultColors = {
  stars: '#4caf50',
  forks: '#2196f3',
  issues: '#f44336',
  prs: '#ff9800',
  'last-commit': '#9c27b0',
  contributors: '#009688',
  watchers: '#795548',
};

// Badge endpoint
app.get('/b', async (req, res) => {
  const { user, repo, type = 'stars', color, labelColor = '#555' } = req.query;

  if (!user || !repo) {
    return res.status(400).send('Error: Please provide both "user" and "repo" query parameters.');
  }

  try {
    // Check cache for existing data
    const cacheKey = `${user}/${repo}/${type}`;
    if (cache.has(cacheKey)) {
      return res.setHeader('Content-Type', 'image/svg+xml').send(cache.get(cacheKey));
    }

    // Fetch repository data from GitHub API
    const { data } = await axios.get(`https://api.github.com/repos/${user}/${repo}`, {
      headers: { 'User-Agent': 'Badge-Generator' },
    });

    let label, value;

    // Determine badge content
    if (type === 'stars') {
      label = 'Stars';
      value = data.stargazers_count;
    } else if (type === 'forks') {
      label = 'Forks';
      value = data.forks_count;
    } else if (type === 'issues') {
      label = 'Issues';
      value = data.open_issues_count;
    } else if (type === 'prs') {
      const prs = await axios.get(`https://api.github.com/repos/${user}/${repo}/pulls?state=open`, {
        headers: { 'User-Agent': 'Badge-Generator' },
      });
      label = 'Open PRs';
      value = prs.data.length;
    } else if (type === 'last-commit') {
      const commits = await axios.get(`https://api.github.com/repos/${user}/${repo}/commits`, {
        headers: { 'User-Agent': 'Badge-Generator' },
      });
      const lastCommitDate = new Date(commits.data[0].commit.author.date);
      label = 'Last Commit';
      value = lastCommitDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } else if (type === 'contributors') {
      const contributors = await axios.get(`https://api.github.com/repos/${user}/${repo}/contributors`, {
        headers: { 'User-Agent': 'Badge-Generator' },
      });
      label = 'Contributors';
      value = contributors.data.length;
    } else if (type === 'watchers') {
      label = 'Watchers';
      value = data.subscribers_count;
    } else {
      return res.status(400).send('Error: Unsupported badge type.');
    }

    const computedColor = color || defaultColors[type] || '#4caf50';

    // Badge dimensions
    const labelWidth = 7 * label.length + 20;
    const valueWidth = 7 * String(value).length + 20;
    const totalWidth = labelWidth + valueWidth;

    // Shields.io-like SVG Badge with a modern touch
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
        <!-- Background rectangles -->
        <rect width="${labelWidth}" height="20" fill="${labelColor}" />
        <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${computedColor}" />
        <!-- Label text -->
        <text x="${labelWidth / 2}" y="14" fill="#fff" font-family="Verdana, sans-serif" font-size="11" text-anchor="middle">
          ${label}
        </text>
        <!-- Value text -->
        <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff" font-family="Verdana, sans-serif" font-size="11" text-anchor="middle">
          ${value}
        </text>
      </svg>
    `;

    // Cache and send response
    cache.set(cacheKey, svg);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    const errorBadge = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" role="img" aria-label="Error">
        <rect width="200" height="20" fill="#f44336" />
        <text x="100" y="14" fill="#fff" font-family="Verdana, sans-serif" font-size="11" text-anchor="middle">
          Error fetching data
        </text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(errorBadge);
  }
});

// Badge preview endpoint
app.get('/preview', (req, res) => {
  const user = 'octocat';
  const repo = 'hello-world';
  const types = ['stars', 'forks', 'issues', 'prs', 'last-commit', 'contributors', 'watchers'];
  const baseUrl = `http://localhost:3000/b`;

  const preview = types
    .map(
      (type) =>
        `<div style="margin-bottom:10px;">
          <img src="${baseUrl}?user=${user}&repo=${repo}&type=${type}" alt="${type}">
        </div>`
    )
    .join('');

  res.send(`<html><body style="font-family:sans-serif;"><h1>Badge Previews</h1>${preview}</body></html>`);
});

// Start server
app.listen(3000, () => {
  console.log('Modern GitHub Badge Generator running on http://localhost:3000');
});
