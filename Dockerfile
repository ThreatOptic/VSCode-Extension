# Build the ThreatOptic VS Code extension (.vsix) without a local Node/npm install.
#
# Extract the VSIX into the current directory (BuildKit):
#   docker build --target artifact --output . .
#
# Or build an image and copy the VSIX out:
#   docker build -t threatoptic-vscode .
#   docker run --rm -v "$(pwd):/out" threatoptic-vscode

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run package \
 && mv *.vsix /threatoptic-vscode.vsix

# Export stage — file lands in the build output directory as threatoptic-vscode.vsix
FROM scratch AS artifact
COPY --from=builder /threatoptic-vscode.vsix /threatoptic-vscode.vsix

# Default image — copy the VSIX to a mounted /out volume
FROM alpine:3.21
COPY --from=builder /threatoptic-vscode.vsix /threatoptic-vscode.vsix
ENTRYPOINT ["cp", "/threatoptic-vscode.vsix"]
CMD ["/out/threatoptic-vscode.vsix"]
