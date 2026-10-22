FROM python:3.12-slim

# OpenCV (used by RapidOCR) needs these shared libraries
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV CYBERSHIELD_DB_PATH=/data/cybershield.db
VOLUME ["/data"]

EXPOSE 8000
# Hosts like Render set $PORT. Proxy headers let rate limits and reporter
# fingerprints see the visitor's IP instead of the platform's load balancer.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
