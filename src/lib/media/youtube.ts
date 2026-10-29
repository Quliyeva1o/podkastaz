/** YouTube video id from a watch, share, shorts or embed link. */
export function youtubeId(url: string) {
  const m = /(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([\w-]{11})/.exec(url);
  return m?.[1];
}
