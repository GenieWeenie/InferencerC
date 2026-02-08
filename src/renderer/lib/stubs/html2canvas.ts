type Html2CanvasOptions = Record<string, unknown>;

export default async function html2canvasStub(
  _element: HTMLElement,
  _options?: Html2CanvasOptions
): Promise<HTMLCanvasElement> {
  throw new Error(
    'html2canvas is not bundled in this build. jsPDF.html() is unsupported.'
  );
}
