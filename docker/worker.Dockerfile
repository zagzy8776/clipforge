FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first, then install whisper with CPU PyTorch
RUN pip3 install --break-system-packages --upgrade pip setuptools wheel
RUN pip3 install --break-system-packages \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip3 install --break-system-packages \
    openai-whisper \
    opencv-python-headless \
    numpy

WORKDIR /app
COPY packages/ ./packages/
COPY worker/ ./worker/
COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

EXPOSE 8080
CMD ["npx", "tsx", "worker/src/index.ts"]
