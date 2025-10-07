const fs = require('fs');
const path = require('path');

class GitHubStorage {
  constructor() {
    this.enabled = false;
    this.octokit = null;
    this.owner = null;
    this.repo = null;
    this.branch = null;
    this.filePath = 'data/giveaways.json';
    this.localPath = path.join(__dirname, '../../data/giveaways.json');
  }

  async init() {
    const token = process.env.GITHUB_TOKEN;
    const repoString = process.env.GITHUB_REPO; // Format: "owner/repo"
    this.branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !repoString) {
      console.log('⚠️ GitHub storage not configured (GITHUB_TOKEN or GITHUB_REPO missing)');
      console.log('💾 Using local storage only');
      this.enabled = false;
      return false;
    }

    try {
      const [owner, repo] = repoString.split('/');
      this.owner = owner;
      this.repo = repo;

      // Dynamic import for ES Module
      const { Octokit } = await import('@octokit/rest');
      this.octokit = new Octokit({ auth: token });

      // Test connection
      await this.octokit.repos.get({ owner: this.owner, repo: this.repo });
      
      console.log(`✅ GitHub storage enabled: ${this.owner}/${this.repo}`);
      this.enabled = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize GitHub storage:', error.message);
      console.log('💾 Falling back to local storage only');
      this.enabled = false;
      return false;
    }
  }

  async loadFromGitHub() {
    if (!this.enabled) {
      return null;
    }

    try {
      console.log(`📥 Loading giveaways from GitHub: ${this.filePath}`);
      
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.filePath,
        ref: this.branch
      });

      if (data.type !== 'file') {
        throw new Error('Path is not a file');
      }

      const content = Buffer.from(data.content, 'base64').toString('utf8');
      
      // Save to local file
      const dataDir = path.dirname(this.localPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.localPath, content, 'utf8');
      
      console.log('✅ Giveaways loaded from GitHub successfully');
      return JSON.parse(content);
    } catch (error) {
      if (error.status === 404) {
        console.log('📝 Giveaways file not found on GitHub, will create on first save');
        return [];
      }
      console.error('❌ Failed to load from GitHub:', error.message);
      return null;
    }
  }

  async saveToGitHub(data) {
    if (!this.enabled) {
      return false;
    }

    try {
      const content = JSON.stringify(data, null, 2);
      const contentBase64 = Buffer.from(content).toString('base64');

      // Get current file SHA (needed for updates)
      let sha;
      try {
        const { data: fileData } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: this.filePath,
          ref: this.branch
        });
        sha = fileData.sha;
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
        // File doesn't exist yet, no SHA needed for creation
      }

      // Create or update file
      const commitMessage = `Update giveaways data - ${new Date().toISOString()}`;
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: this.filePath,
        message: commitMessage,
        content: contentBase64,
        branch: this.branch,
        sha: sha // Include SHA for updates, undefined for creation
      });

      console.log('✅ Giveaways saved to GitHub successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save to GitHub:', error.message);
      return false;
    }
  }

  async syncToGitHub() {
    if (!this.enabled) {
      return false;
    }

    try {
      // Read local file
      if (!fs.existsSync(this.localPath)) {
        console.log('⚠️ Local giveaways file not found, nothing to sync');
        return false;
      }

      const content = fs.readFileSync(this.localPath, 'utf8');
      const data = JSON.parse(content);

      // Save to GitHub
      return await this.saveToGitHub(data);
    } catch (error) {
      console.error('❌ Failed to sync to GitHub:', error.message);
      return false;
    }
  }
}

module.exports = GitHubStorage;
