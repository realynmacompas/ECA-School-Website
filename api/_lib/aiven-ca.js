/* =========================================================
   Aiven "Project CA" certificate (PUBLIC, not a secret)

   The database server proves it's really Aiven with this
   certificate. It gives nobody access to the database (that
   needs the password in DATABASE_URL), so it's safe in code.

   Bundled here because pasting certificates into Vercel's
   settings often breaks them. When switching to another
   database (e.g. the school's), either replace this text with
   that server's CA certificate, or set DATABASE_CA_CERT on
   Vercel (a valid DATABASE_CA_CERT always wins).
   Aiven: Service > Overview > CA certificate > Download.
   ========================================================= */

export const BUNDLED_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIERDCCAqygAwIBAgIULOnJTvoUpRxmrg4WUxvTXE6L+ZAwDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvZTM1ZTkzNjctZTc2My00NzAyLTljYjktYzZjM2JkNzMw
MzhmIFByb2plY3QgQ0EwHhcNMjYxMDIxMDc0NjE3WhcNMzYxMDE4MDc0NjE3WjA6
MTgwNgYDVQQDDC9lMzVlOTM2Ny1lNzYzLTQ3MDItOWNiOS1jNmMzYmQ3MzAzOGYg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAL1wBaG5
n0zIidoaiWhYnNqV1p7N+kPrjWEjW1/FInicQ1aik13AdyiwtmFxbmpWtvKRvhQ7
xxj0Z84F+qx5ZzmnWi+Id2d+1bctiLoPkal6VOKWc7+jPs1lxIs+5YJfzVakqfzw
JiRNlt7oEbfZqQ5XdWOSykm/6EcpqIcNmCpWymB9v525c3w8B2KgNdVIUPSH+6Gt
LftrqM31M07zhmsHpbHCMRpl/neIEd/JAf3aY24c7mu07Tumk4T05zZSnuHJdLCL
pd/QRkJJCCHkO1ZKidmfejYs/SKs6Mr2e7zxmFuKU0SzMx65NKL1vgF9C5363VOw
rbNc8cQq8lhOr7cdCyW1xeVys1aC0mFj2m9j1JTo9/jl2OBgVIKtIeDFLKv643Ys
iU5OcSCR/C6JjcghGfngF4Du6bS4nXEqwuWvHXanoJFYpLnTBgz6VCCMqS5+iXZU
29mTzAIr+ZilptKsNQ7OTY+wvEswdQheHmxwxOXkxnDPv8uebbRQUb80jQIDAQAB
o0IwQDAdBgNVHQ4EFgQU0PX1VIEXzIO7yxirOpN/X5iAOY8wEgYDVR0TAQH/BAgw
BgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAA1VR18nzmWa
gPGBUck4RUnnYkJcMFxl2iv7nudq/6kl1QpLj3DDs2y+zY8TFVI4VM1MUhtwilMx
cP86hiKhmZJc4VJWS7Iv9fVtb63ofkMYP2CwL6xjURELZsvCOtw+QG9T9UO77nB4
tzuitUbsIpAjIm9TBnLbmUnagZ9oYKW9yM6a9F8Ta/V1HPpf/J3mv2y+1quVY4ZW
jtOapKYorAPX0T62Lmsau/2s3X8tRZ8f1P8ovufphTnWGjBTqnUybNNmO+3ZpJe3
2n9WI50hxEWI7CiRIxPY4cia3l2ISSNG+oAcU1+IZbASVoN9BUxObBJjOyL8Q471
UTsuBpLmuUBKaZ66StojdntowqjTJlP+1cMIKD4x5RPS7geHZaQRVDJhp4lgINBw
2+RB4DjOF967shNxJanjaWck80cnYQ9bcYFTvD28JEehUX1jYZtkfWtqeAKSS9el
pkp/pUuD766gRZCRydbVH6Ve7N7hvN6ceFkfO504rYRcrmMZaJq6XQ==
-----END CERTIFICATE-----
`;
