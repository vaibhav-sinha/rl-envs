FROM metaphi/figma-design-base:latest

COPY design.hfc.json /data/workspace/design.hfc.json
COPY design.hfc.json /tests/design.initial.hfc.json
COPY instruction.md /tests/instruction.md
ENV HFC_INITIAL_FILE=/data/workspace/design.hfc.json

COPY assets/ /app/assets/
