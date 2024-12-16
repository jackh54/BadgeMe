const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

app.get('/github-badge', async (req, res) => {
  const { user, repo, type = 'stars', color = '#4caf50', labelColor = '#555', message = '' } = req.query;

  if (!user || !repo) {
    res.status(400).send('Error: Please provide both "user" and "repo" query parameters.');
    return;
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
    } else if (type === 'custom') {
      label = 'Custom';
      value = message || 'N/A';
    } else {
      res.status(400).send('Error: Unsupported badge type.');
      return;
    }

    // Badge dimensions
    const labelWidth = 7 * label.length + 20;
    const valueWidth = 7 * String(value).length + 20;
    const totalWidth = labelWidth + valueWidth;

    // Modern SVG Badge
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="30" role="img" aria-label="${label}: ${value}">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${labelColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${labelWidth}" height="30" rx="6" ry="6" fill="${labelColor}" />
        <rect x="${labelWidth}" width="${valueWidth}" height="30" rx="6" ry="6" fill="${color}" />
        <rect width="${totalWidth}" height="30" rx="6" ry="6" fill="url(#grad1)" opacity="0.2" />
        <text x="${labelWidth / 2}" y="20" fill="#fff" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">
          ${label}
        </text>
        <text x="${labelWidth + valueWidth / 2}" y="20" fill="#fff" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">
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
    res.status(500).send('Error fetching GitHub repository data.');
  }
});

// Start server
app.listen(3000, () => {
  console.log('Modern GitHub Badge Generator running on http://localhost:3000');
});
