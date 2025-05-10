# BURST System Call Interface

## Overview

System calls in BURST provide the interface between user programs and system services. They follow a consistent register-based calling convention.

## Calling Convention

- System call number in **R0**
- Arguments in **R1-R5** (up to 5 arguments)
- Return value in **R0**
- Additional return values in **R1-R3**
- Error code in FLAGS register

## System Call Numbers

System calls are organized into categories with reserved ranges:

| Range    | Category          |
|----------|-------------------|
| 1-9      | Memory Management |
| 10-19    | File I/O          |
| 20-29    | Process Control   |
| 30-39    | Console I/O       |
| 40-49    | Time Operations   |
| 50-59    | Host Bridge       |
| 60-255   | Reserved          |

## System Call Reference

### Memory Management

#### SYS_ALLOC (1)
Allocate memory block.
- **Input**: R1 = size in bytes
- **Output**: R0 = pointer to allocated memory (0 on failure)
- **Errors**: E_NOMEM

#### SYS_FREE (2)
Free allocated memory.
- **Input**: R1 = pointer to memory block
- **Output**: R0 = 0 on success
- **Errors**: E_INVAL

#### SYS_REALLOC (3)
Resize memory block.
- **Input**: R1 = pointer, R2 = new size
- **Output**: R0 = new pointer (0 on failure)
- **Errors**: E_NOMEM

### File I/O

#### SYS_READ (10)
Read from file descriptor.
- **Input**: R1 = fd, R2 = buffer, R3 = count
- **Output**: R0 = bytes read (-1 on error)
- **Errors**: E_BADFD, E_IO

#### SYS_WRITE (11)
Write to file descriptor.
- **Input**: R1 = fd, R2 = buffer, R3 = count
- **Output**: R0 = bytes written (-1 on error)
- **Errors**: E_BADFD, E_IO

#### SYS_OPEN (12)
Open file.
- **Input**: R1 = path, R2 = flags, R3 = mode
- **Output**: R0 = file descriptor (-1 on error)
- **Errors**: E_NOTFOUND, E_PERM

#### SYS_CLOSE (13)
Close file descriptor.
- **Input**: R1 = fd
- **Output**: R0 = 0 on success
- **Errors**: E_BADFD

#### SYS_SEEK (14)
Set file position.
- **Input**: R1 = fd, R2 = offset, R3 = whence
- **Output**: R0 = new position (-1 on error)
- **Errors**: E_BADFD, E_INVAL

### Process Control

#### SYS_EXIT (20)
Exit process.
- **Input**: R1 = exit status
- **Output**: Does not return

#### SYS_FORK (21)
Create new process.
- **Input**: None
- **Output**: R0 = child PID (parent), 0 (child)
- **Errors**: E_NOMEM

#### SYS_EXEC (22)
Execute program.
- **Input**: R1 = path, R2 = argv, R3 = envp
- **Output**: Does not return on success
- **Errors**: E_NOTFOUND, E_PERM

#### SYS_WAIT (23)
Wait for child process.
- **Input**: R1 = pid, R2 = status pointer
- **Output**: R0 = child PID
- **Errors**: E_CHILD

#### SYS_GETPID (24)
Get current process ID.
- **Input**: None
- **Output**: R0 = process ID

### Console I/O

#### SYS_PRINT (30)
Print string to console.
- **Input**: R1 = string pointer, R2 = length
- **Output**: R0 = bytes written
- **Errors**: E_IO

#### SYS_INPUT (31)
Read line from console.
- **Input**: R1 = buffer, R2 = max length
- **Output**: R0 = bytes read
- **Errors**: E_IO

#### SYS_PUTCHAR (32)
Write character to console.
- **Input**: R1 = character
- **Output**: R0 = 1 on success
- **Errors**: E_IO

#### SYS_GETCHAR (33)
Read character from console.
- **Input**: None
- **Output**: R0 = character (-1 on EOF)
- **Errors**: E_IO

### Time Operations

#### SYS_TIME (40)
Get current time.
- **Input**: R1 = buffer for timespec
- **Output**: R0 = 0 on success
- **Errors**: E_INVAL

#### SYS_SLEEP (41)
Sleep for specified time.
- **Input**: R1 = milliseconds
- **Output**: R0 = 0 on success
- **Errors**: None

### Host Bridge

#### SYS_HOST_EXEC (50)
Execute host system command.
- **Input**: R1 = command string
- **Output**: R0 = exit status
- **Errors**: E_PERM

#### SYS_HOST_ENV (51)
Get host environment variable.
- **Input**: R1 = name, R2 = buffer
- **Output**: R0 = 0 on success
- **Errors**: E_NOTFOUND

#### SYS_HOST_CWD (52)
Get host current directory.
- **Input**: R1 = buffer
- **Output**: R0 = 0 on success
- **Errors**: E_IO

## Error Codes

| Code     | Name      | Description              |
|----------|-----------|--------------------------|
| 0        | E_OK      | Success                  |
| 1        | E_NOMEM   | Out of memory            |
| 2        | E_BADFD   | Bad file descriptor      |
| 3        | E_NOTFOUND| File/Resource not found  |
| 4        | E_PERM    | Permission denied        |
| 5        | E_IO      | I/O error                |
| 6        | E_NOSYS   | System call not implemented |
| 7        | E_INVAL   | Invalid argument         |
| 8        | E_CHILD   | No child processes       |

## File Open Flags

| Flag     | Value | Description              |
|----------|-------|--------------------------|
| O_RDONLY | 0x00  | Open for reading only    |
| O_WRONLY | 0x01  | Open for writing only    |
| O_RDWR   | 0x02  | Open for reading/writing |
| O_CREAT  | 0x40  | Create if doesn't exist  |
| O_TRUNC  | 0x200 | Truncate to zero length  |
| O_APPEND | 0x400 | Append to end of file    |

## Seek Whence Values

| Name     | Value | Description              |
|----------|-------|--------------------------|
| SEEK_SET | 0     | Seek from beginning      |
| SEEK_CUR | 1     | Seek from current position |
| SEEK_END | 2     | Seek from end            |

## Example Usage

### Print "Hello, World!"
```assembly
    MOVI  R1, hello_str   ; String pointer
    MOVI  R2, 13          ; String length
    MOVI  R0, 30          ; SYS_PRINT
    SYSCALL 0             ; Make system call
```

### Open and Read File
```assembly
    MOVI  R1, filename    ; Path to file
    MOVI  R2, 0           ; O_RDONLY
    MOVI  R3, 0           ; Mode (unused)
    MOVI  R0, 12          ; SYS_OPEN
    SYSCALL 0
    
    MOV   R4, R0          ; Save file descriptor
    MOV   R1, R0          ; fd parameter
    MOVI  R2, buffer      ; Buffer address
    MOVI  R3, 1024        ; Read up to 1024 bytes
    MOVI  R0, 10          ; SYS_READ
    SYSCALL 0
```

## Future Extensions

- Memory mapping (mmap/munmap)
- Signal handling
- Thread creation and synchronization
- Shared memory
- Network operations
- Graphics and window management
