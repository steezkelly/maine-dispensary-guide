export const GET = () => {
  return new Response("4a00ca05232c46f3badda7f9f2e0e296", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, must-revalidate",
    },
  });
};
