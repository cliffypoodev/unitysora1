import { LogIn, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const LOGO =
  "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3cb3a56cc_ChatGPT_Image_May_12__2026__02_08_14_PM.png";

export default function SignIn() {
  const { loginWithGoogle, isLoadingAuth } = useAuth();

  return (
    <div className="min-h-dvh grid place-items-center bg-background px-6 inset-safe">
      <div className="w-full max-w-sm text-center animate-fade-up">
        <img src={LOGO} alt="" className="mx-auto h-14 w-14 rounded-xl object-cover no-drag" />

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">UnitySora</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private AI image and video generation.
        </p>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={isLoadingAuth}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isLoadingAuth ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <LogIn className="h-[18px] w-[18px]" />
          )}
          Continue with Google
        </button>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Everything you generate stays visible only to your account
        </p>
      </div>
    </div>
  );
}
