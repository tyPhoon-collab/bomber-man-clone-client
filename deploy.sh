#!/bin/bash

# 色を使った出力関数
print_green() {
    tput setaf 2  # 緑色
    echo "$1"
    tput sgr0     # 色をリセット
}

print_yellow() {
    tput setaf 3  # 黄色
    echo "$1"
    tput sgr0     # 色をリセット
}

print_red() {
    tput setaf 1  # 赤色
    echo "$1"
    tput sgr0     # 色をリセット
}

# デフォルト値（必要に応じて変更可能）
BUILD_COMMAND="npm run build"
DEPLOY_COMMAND="npx wrangler pages deploy dist --project-name bomber-man"
SOURCE_DIR="dist"
PROJECT_NAME="bomber-man"

# 確認メッセージの出力
print_yellow "Deployment process with the following settings:"
echo "Build Command: $BUILD_COMMAND"
echo "Source Directory: $SOURCE_DIR"
echo "Project Name: $PROJECT_NAME"
echo

# デプロイの確認
read -p "$(tput setaf 3)Continue with deployment? (y/n): $(tput sgr0)" confirm
if [[ $confirm != "y" ]]; then
    print_red "Deployment canceled."
    exit 1
fi

# ビルドの実行
print_yellow "Running build command..."
if $BUILD_COMMAND; then
    print_green "Build completed successfully!"
else
    print_red "Build failed. Aborting deployment."
    exit 1
fi

# デプロイの実行
print_yellow "Deploying to Cloudflare Pages..."
if $DEPLOY_COMMAND; then
    print_green "Deployment completed successfully!"
else
    print_red "Deployment failed."
    exit 1
fi