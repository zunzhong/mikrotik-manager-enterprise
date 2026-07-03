# Authentication Design

## RouterOS v7 Login

```txt
/login
=name=<username>
=password=<password>
```

Expected:

```txt
!done
```

## RouterOS v6 Challenge Login

```txt
/login
```

Router returns:

```txt
!done
=ret=<challenge>
```

Client sends:

```txt
/login
=name=<username>
=response=00 + md5(password + challenge)
```

## Strategy

`AuthService` will attempt modern login first.

If the server responds with challenge `ret`, it will fallback to challenge login.
