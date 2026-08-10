Deno.serve(() =>
  Response.json(
    {
      success: false,
      error: "This legacy video provider has been retired. Use the huggingFaceVideo function.",
      replacement: "huggingFaceVideo",
    },
    { status: 410 },
  )
);
