import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  // 获取请求头信息（在 Next.js 新版本中需要 await）
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";

  // 简单的 UA 判断：是否是移动端设备
  const isMobile = Boolean(
    userAgent.match(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  );

  // 根据当前访问的设别，重定向到对应的终端界面
  if (isMobile) {
    redirect("/mobile");
  } else {
    redirect("/admin");
  }
}
