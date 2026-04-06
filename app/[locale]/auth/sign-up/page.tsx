import { redirect } from "next/navigation";

type LocaleSignUpPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleSignUpPage({ params }: LocaleSignUpPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/auth/sign-in`);
}
