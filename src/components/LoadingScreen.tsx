import logo from "@/assets/happyrider-logo.png";

type LoadingScreenProps = {
  message?: string;
  fullScreen?: boolean;
};

/**
 * โลโก้ HappyRider ตัวใหญ่ + วงกลมหมุนรอบ ๆ
 * ใช้แทนข้อความ "กำลังโหลด..." ทุกจุดในแอป
 */
export function LoadingScreen({
  message = "กำลังโหลด...",
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6"
          : "flex flex-col items-center justify-center gap-6 py-12"
      }
    >
      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* วงกลมหมุน */}
        <div
          className="absolute inset-0 rounded-full border-4 border-primary/15 border-t-primary animate-spin"
          style={{ animationDuration: "1.1s" }}
          aria-hidden
        />
        <div
          className="absolute inset-3 rounded-full border-2 border-primary/10 border-b-primary/60 animate-spin"
          style={{ animationDuration: "1.6s", animationDirection: "reverse" }}
          aria-hidden
        />
        {/* โลโก้ */}
        <img
          src={logo}
          alt="HappyRider"
          className="relative h-28 w-28 object-contain drop-shadow-md"
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
