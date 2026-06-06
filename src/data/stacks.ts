export type Stack = {
  slug: string;
  name: string;
  blurb: string;
  status: "live" | "expanding" | "planned";
  count?: number;
};

export const stacks: Stack[] = [
  {
    slug: "flutter",
    name: "Flutter",
    blurb: "Original collection — Dart-based, cross-platform mobile apps.",
    status: "live",
    count: 150,
  },
  {
    slug: "react-native",
    name: "React Native",
    blurb: "JavaScript / TypeScript mobile apps using React.",
    status: "expanding",
  },
  {
    slug: "ios",
    name: "iOS",
    blurb: "Native Swift apps from the App Store and the open-source community.",
    status: "expanding",
  },
  {
    slug: "android",
    name: "Android",
    blurb: "Native Kotlin / Java apps with a long, mature history.",
    status: "expanding",
  },
  {
    slug: "kmp",
    name: "Kotlin Multiplatform",
    blurb: "Shared Kotlin codebases targeting iOS and Android.",
    status: "planned",
  },
  {
    slug: "capacitor",
    name: "Capacitor",
    blurb: "Hybrid mobile apps built on web standards.",
    status: "planned",
  },
];
