# food

#### Docker

If you have [Docker][] and [Docker Compose][] installed you can use the provided
docker-compose.yml file to automatically set up a MySQL container to work against.
You can start the container with this command from the repositories root directory:

```shell
docker-compose up -d
```

To stop the container:

```shell
docker-compose stop
```

To stop and remove the container and the associated docker volume:

```shell
docker-compose down -v
```

##### Adminer

The provided docker-compose.yml file also defines a Adminer container which will be created and started alongside the MySQL container.
Adminer provides a web interface for database management which can be used for easy administration of your database while working on the application.
Access Adminer by visiting the URL [`localhost:8080`](http://localhost:8080) in a browser after starting the container.
There use the following credentials to login:

```
Server: food-mysql
Username: root
Password: yRpEH7JM74dtaT
```
