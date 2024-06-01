import { VercelRequest, VercelResponse } from "@vercel/node";
import allowCors from "./_cors";
async function handler(request: VercelRequest, response: VercelResponse) {
  const { CHALLENGE  } = request.query;
  response.json({
    CHALLENGE,
  });
}

export default allowCors(handler);
