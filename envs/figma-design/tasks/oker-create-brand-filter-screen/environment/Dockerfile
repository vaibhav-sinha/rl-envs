FROM metaphi/figma-design-base:latest

COPY design.hfc.json /data/workspace/design.hfc.json
COPY design.hfc.json /tests/design.initial.hfc.json
COPY instruction.md /tests/instruction.md
ENV HFC_INITIAL_FILE=/data/workspace/design.hfc.json
ENV HFC_PREVIEW_ON_LOAD=0

COPY assets/ /app/assets/

COPY design.hfc.assets/ /data/workspace/design.hfc.assets/
