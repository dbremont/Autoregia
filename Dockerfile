FROM python:3.12-slim
WORKDIR /srv

COPY . .

# Install root + every sub-system's dependencies. Skip desktop-input libraries
# (evdev/pynput/python-xlib): they are only needed by the collectors that run
# on the desktop host, not by the servers inside the container.
RUN find . -name requirements.txt | xargs cat \
    | grep -vE '^\s*(#|$)' \
    | grep -vE '^(evdev|pynput|python-xlib)' \
    | sort -u > /tmp/requirements.txt \
    && pip install --no-cache-dir -r /tmp/requirements.txt

ENV PYTHONUNBUFFERED=1
EXPOSE 8080
CMD ["python", "app/app.py"]
