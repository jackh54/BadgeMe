const express = require('express');
const axios = require('axios');
const app = express();

app.get('/github-badge', async (req, res) => {
  const { user, repo, type = 'stars', color = '#4caf50', labelColor = '#555' } = req.query;

  if (!user || !repo) {
    res.status(400).send('Error: Please provide both "user" and "repo" query parameters.');
    return;
  }

  try {
    // Fetch repository data from GitHub API
    const { data } = await axios.get(`https://api.github.com/repos/${user}/${repo}`, {
      headers: { 'User-Agent': 'Badge-Generator' },
    });

    // Determine badge content
    let label, value;
    if (type === 'stars') {
      label = 'Stars';
      value = data.stargazers_count;
    } else if (type === 'forks') {
      label = 'Forks';
      value = data.forks_count;
    } else if (type === 'issues') {
      label = 'Issues';
      value = data.open_issues_count;
    } else {
      res.status(400).send('Error: Unsupported badge type. Use "stars", "forks", or "issues".');
      return;
    }

    // Badge dimensions
    const labelWidth = 7 * label.length + 20; // Dynamic width for label
    const valueWidth = 7 * String(value).length + 20; // Dynamic width for value
    const totalWidth = labelWidth + valueWidth;

    // SVG Badge
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${labelColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${totalWidth}" height="20" rx="3" ry="3" fill="url(#grad1)" />
        <rect x="0" width="${labelWidth}" height="20" rx="3" ry="3" fill="${labelColor}" />
        <rect x="${labelWidth}" width="${valueWidth}" height="20" rx="3" ry="3" fill="${color}" />
        <text x="${labelWidth / 2}" y="14" fill="#fff" font-family="Verdana, sans-serif" font-size="11" text-anchor="middle">
          ${label}
        </text>
        <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff" font-family="Verdana, sans-serif" font-size="11" text-anchor="middle">
          ${value}
        </text>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);

  } catch (error) {
    res.status(500).send('Error fetching GitHub repository data.');
  }
});

// Start server
app.listen(3000, () => {
  console.log('GitHub Badge Generator running on http://localhost:3000');
});
