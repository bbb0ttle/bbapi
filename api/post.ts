import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_supabase";
import allowCors from "./_cors";
import showdown from "showdown";
import { backupPostToGitHub } from "./_github_backup";

showdown.setFlavor('github');

const converter = new showdown.Converter();

async function handler(request: VercelRequest, response: VercelResponse) {
  const { title, content } = JSON.parse(request.body);

  const titleWithoutExtension = title.split(".")[0];

  if (!title || !content) {
    response.status(400).json({ error: "Title and content are required" });
    return;
  }

  const html = converter.makeHtml(content);

  const wrappedHtml = html.includes("<p>") ? html : `<p>${html}</p>`;

  const { data, error } = await supabase.from("post")
    .upsert({
      title: titleWithoutExtension,
      content: wrappedHtml
    });

  if (error) {
    console.log(error);
    response.status(500).json({ error: "Something went wrong" });
    return
  }

  // Backup current post to GitHub
  try {
    await backupPostToGitHub({ title: titleWithoutExtension, content: wrappedHtml, created_at: new Date().toISOString() });
  } catch (backupError) {
    console.error("Failed to backup post to GitHub:", backupError);
  }

  response.status(200).json(data?.[0] ?? null);
}

export default allowCors(handler);
