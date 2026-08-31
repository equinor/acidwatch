FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

RUN apt-get update && apt-get install -y curl

RUN curl -s https://deb.nodesource.com/setup_22.x | bash 
    
RUN apt-get update

RUN apt-get install -y nodejs

# Installing git-lfs to accomodate for large files used in arcs
RUN apt-get install -y git-lfs  

RUN node -v && npm -v

RUN apt-get install -y python3-venv

# Install OpenJDK 17 for Java support (needed by solubilityCCS)
RUN apt-get install -y openjdk-17-jre

# Install uv
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh