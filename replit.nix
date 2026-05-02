{pkgs}: {
  deps = [
    pkgs.wkhtmltopdf
    pkgs.libreoffice-fresh
    pkgs.pixman
    pkgs.librsvg
    pkgs.giflib
    pkgs.libjpeg
    pkgs.pango
    pkgs.cairo
    pkgs.pkg-config
    pkgs.ghostscript
    pkgs.qpdf
    pkgs.libuuid
  ];
}
