FROM ubuntu:24.04

# Install Node.js, npm, zsh, Oh My Zsh dependencies, and SDKMAN prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    git \
    zsh \
    zip \
    unzip \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install SDKMAN and Java 25
ENV SDKMAN_DIR="/root/.sdkman"
RUN curl -s "https://get.sdkman.io" | bash \
    && bash -c "source /root/.sdkman/bin/sdkman-init.sh && sdk install java 25-tem"

# Make SDKMAN and Java available in all subsequent layers
ENV JAVA_HOME="/root/.sdkman/candidates/java/current"
ENV PATH="${JAVA_HOME}/bin:${SDKMAN_DIR}/bin:${PATH}"

# Install Oh My Zsh (unattended, no shell change)
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Install opencode globally via npm
RUN npm install -g opencode-ai

WORKDIR /project

# Disable auto-update inside the container — the version is managed via the image
ENV OPENCODE_CONFIG_CONTENT='{"autoupdate":false}'

# Set Agnoster theme for Oh My Zsh and add SDKMAN init to .zshrc
RUN sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="eastwood"/' /root/.zshrc \
    && echo '\n# SDKMAN\nexport SDKMAN_DIR="/root/.sdkman"\n[[ -s "/root/.sdkman/bin/sdkman-init.sh" ]] && source "/root/.sdkman/bin/sdkman-init.sh"' >> /root/.zshrc

# Set zsh as the default shell
SHELL ["/bin/zsh", "-c"]

ENTRYPOINT ["/bin/zsh"]
