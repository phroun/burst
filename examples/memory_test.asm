; === memory_test.asm ===
; Test memory allocation and manipulation
main:
    ; Allocate 100 bytes
    movi r0, #1            ; SYS_ALLOC
    movi r1, #100          ; Size
    syscall
    
    ; Check if allocation succeeded
    cmp r0, #0
    jeq alloc_failed
    
    ; Save allocated pointer
    mov r5, r0
    
    ; Write some data
    movi r1, #0x12345678
    store r1,
