# Runtime: prebuilt .output only. HTTPS is handled by host nginx-ssl container.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY .output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
