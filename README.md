# Redis-Proxy

Extremely simple HTTP proxy with Redis based routing

## Edit routes

All routes are located in a redis hash named `proxy~routes` where key is the domain to check and value is the host to route to.

For example to route all requests to domain *example.com* to *localhost:8080* you could add the following data to redis:

```
> redis-cli
SELECT 5
HSET proxy~router "example.com" "localhost:8080"
```

By default all data is stored in redis DB n. 5 but this can be changed in the config file

## License

**MIT**