export function QrCodeDisplay({ qrCode }: { qrCode: string }) {
 const trimmed = qrCode.trim();

 if (trimmed.startsWith("data:image")) {
 return (
 <img
 alt="Scan this QR code with your authenticator app"
 className="mx-auto h-auto w-full max-w-[200px]"
 src={trimmed}
 />
 );
 }

 if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
 return (
 <div
 className="mx-auto max-w-[200px] [&_svg]:h-auto [&_svg]:w-full"
 dangerouslySetInnerHTML={{ __html: trimmed }}
 />
 );
 }

 return (
 <p className="text-center text-sm text-sp-navy-muted">
 QR preview unavailable. Use the manual setup key below in your authenticator app.
 </p>
 );
}
