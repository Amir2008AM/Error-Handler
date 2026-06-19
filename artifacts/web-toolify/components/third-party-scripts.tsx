import Script from 'next/script'

export default function ThirdPartyScripts() {
  return (
    <>
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4805747941246928"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-SVNB9EP5YP"
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-SVNB9EP5YP');
        `}
      </Script>
      <Script
        src="https://analytics.ahrefs.com/analytics.js"
        data-key="QJVgLKTTo6yseBMo0aT08w"
        strategy="afterInteractive"
        async
      />
    </>
  )
}
