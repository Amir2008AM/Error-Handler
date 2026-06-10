'use client'

import { useEffect } from 'react'

export default function ThirdPartyScripts() {
  useEffect(() => {
    const adsbygoogle = document.createElement('script')
    adsbygoogle.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4805747941246928'
    adsbygoogle.async = true
    adsbygoogle.crossOrigin = 'anonymous'
    document.head.appendChild(adsbygoogle)

    const gtag = document.createElement('script')
    gtag.src = 'https://www.googletagmanager.com/gtag/js?id=G-SVNB9EP5YP'
    gtag.async = true
    document.head.appendChild(gtag)

    const gtagInit = document.createElement('script')
    gtagInit.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-SVNB9EP5YP');
    `
    document.head.appendChild(gtagInit)
  }, [])

  return null
}
