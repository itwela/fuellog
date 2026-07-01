import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <SignIn
        appearance={{
          ...(dark as object),
          variables: {
            colorPrimary: "#b6ff4a",
            colorBackground: "#111111",
            colorNeutral: "#ffffff",
            borderRadius: "4px",
          },
          elements: {
            card: "shadow-none border border-white/10",
            headerTitle: "!text-[#f2f2f2]",
            headerSubtitle: "!text-[#888]",
            dividerText: "!text-[#555]",
            dividerLine: "!bg-white/10",
            formFieldLabel: "!text-[#aaa]",
            formFieldSuccessText: "!text-[#aaa]",
            formFieldHintText: "!text-[#aaa]",
            formFieldInput: "!text-[#f2f2f2] !bg-[#1a1a1a] !border-white/10",
            otpCodeFieldInput: "!text-[#f2f2f2] !bg-[#1a1a1a] !border-white/10",
            formButtonPrimary: "!bg-[#b6ff4a] !text-black hover:!bg-[#c8ff6a] font-semibold",
            footer: "!text-[#555]",
            footerText: "!text-[#555]",
            footerActionText: "!text-[#888]",
            footerActionLink: "!text-[#b6ff4a]",
          },
        }}
        forceRedirectUrl="/app"
      />
    </div>
  );
}
