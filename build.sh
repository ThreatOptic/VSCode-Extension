rm -f threatoptic-vscode.vsix
docker build --target artifact --output . .

# cursor --install-extension threatoptic-vscode.vsix