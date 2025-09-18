// submit.js
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

// The repository details
const GITHUB_OWNER = 'tpreisser'; // Your GitHub username
const GITHUB_REPO = 'TPFHSU-Inquiry-Form'; // Your repository name
const FILE_PATH = 'submissions.csv';

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const formData = JSON.parse(event.body);

    // Format the data as a single line in a CSV file
    const timestamp = new Date().toISOString();
    const headers = "Timestamp,Name,Email,Phone,Snapchat";
    const newRow = `\n"${timestamp}","${formData.name || ''}","${formData.email || ''}","${formData.phone || ''}","${formData.snapchat || ''}"`;

    let currentContent = '';
    let fileSha = '';

    try {
      // Check if the submissions.csv file already exists
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
      });
      currentContent = Buffer.from(data.content, 'base64').toString('utf8');
      fileSha = data.sha;
    } catch (error) {
      // If the file doesn't exist (a 404 error), we'll create it.
      if (error.status !== 404) throw error;
    }
    
    // Prepare the new file content
    const finalContent = currentContent ? currentContent + newRow : headers + newRow;
    const encodedContent = Buffer.from(finalContent).toString('base64');

    // Use the GitHub API to write the file
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `New form submission`,
      content: encodedContent,
      sha: fileSha || undefined, 
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ result: 'success' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ result: 'error', message: error.message }),
    };
  }
};
