FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api .

FROM gcr.io/distroless/static
COPY --from=build /api /api
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/api"]
