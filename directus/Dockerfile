FROM directus/directus:11.17.4

USER root
COPY ./extensions /directus/extensions
RUN chown -R node:node /directus/extensions
USER node

EXPOSE 8055
