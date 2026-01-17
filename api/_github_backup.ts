const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "bbb0ttle";
const REPO_NAME = "b.bbki.ng";
const FILE_PATH = "posts.json";
const BRANCH = "main";

interface GitHubFileResponse {
  sha: string;
  content: string;
}

interface Post {
  title: string;
  content: string;
 created_at: string;
}

async function getFileContent(): Promise<{ sha: string; posts: Post[] } | null> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to get file: ${res.statusText}`);
  }

  const data: GitHubFileResponse = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { sha: data.sha, posts: JSON.parse(content) };
}

export async function backupPostToGitHub(post: Post): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN not set, skipping backup");
    return;
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  const existingFile = await getFileContent();

  let posts: Post[] = existingFile?.posts || [];

  // Update existing post or add new one
  const existingIndex = posts.findIndex((p) => p.title === post.title);
  if (existingIndex >= 0) {
    posts[existingIndex] = post;
  } else {
    posts.push(post);
  }

  const content = JSON.stringify(posts, null, 2);
  const contentBase64 = Buffer.from(content).toString("base64");

  const body: Record<string, string> = {
    message: `Backup post "${post.title}" at ${new Date().toISOString()}`,
    content: contentBase64,
    branch: BRANCH,
  };

  if (existingFile) {
    body.sha = existingFile.sha;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to backup to GitHub: ${res.statusText} - ${error}`);
  }

  console.log(`Post "${post.title}" backed up to GitHub successfully`);
}
