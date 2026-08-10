Deno.serve(() =>
  Response.json(
    {
      success: false,
      error: "This legacy image-to-video provider has been retired. Use the huggingFaceVideo function with reference_image_url.",
      replacement: "huggingFaceVideo",
    },
    { status: 410 },
  )
);
