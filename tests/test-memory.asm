; BURST VM Memory Instruction Tests
; Tests LOAD, STORE, LOADB, STOREB, PUSH, POP

main:
    jmp test_start

; Test data
test_name:      .string "=== Memory Tests ==="
pass_msg:       .string "PASS: "
fail_msg:       .string "FAIL: "
load_test:      .string "LOAD test"
store_test:     .string "STORE test"
loadb_test:     .string "LOADB test"
storeb_test:    .string "STOREB test"
push_test:      .string "PUSH test"
pop_test:       .string "POP test"
stack_test:     .string "Stack test"
newline:        .byte 10

test_start:
    ; Print test header
    movi r1, #test_name
    movi r2, #20
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall

    ; Test STORE/LOAD
    call test_store_load
    
    ; Test STOREB/LOADB
    call test_storeb_loadb
    
    ; Test PUSH/POP
    call test_push_pop
    
    ; Test stack operations
    call test_stack_ops
    
    halt

; STORE/LOAD Test
test_store_load:
    ; Use address 0x1000 for testing
    movi r10, #0x1000
    
    ; Store value 0x1234
    movi r3, #0x1234
    
    store r3, r10, #0
    
    ; Load it back
    load r5, r10, #0
    
    ; Compare
    cmp r3, r5
    jeq store_load_pass
    
store_load_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp store_load_done
    
store_load_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
store_load_done:
    movi r1, #store_test
    movi r2, #10
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; STOREB/LOADB Test
test_storeb_loadb:
    ; Use address 0x1100 for testing
    movi r10, #0x1100
    
    ; Store bytes 0xAA, 0xBB, 0xCC, 0xDD
    movi r3, #0xAA
    storeb r3, r10, #0
    
    movi r3, #0xBB
    storeb r3, r10, #1
    
    movi r3, #0xCC
    storeb r3, r10, #2
    
    movi r3, #0xDD
    storeb r3, r10, #3
    
    ; Load them back
    loadb r4, r10, #0
    movi r6, #0xAA
    cmp r4, r6
    jne storeb_loadb_fail
    
    loadb r4, r10, #1
    movi r6, #0xBB
    cmp r4, r6
    jne storeb_loadb_fail
    
    loadb r4, r10, #2
    movi r6, #0xCC
    cmp r4, r6
    jne storeb_loadb_fail
    
    loadb r4, r10, #3
    movi r6, #0xDD
    cmp r4, r6
    jne storeb_loadb_fail
    
    jmp storeb_loadb_pass
    
storeb_loadb_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp storeb_loadb_done
    
storeb_loadb_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
storeb_loadb_done:
    movi r1, #storeb_test
    movi r2, #11
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; PUSH/POP Test
test_push_pop:
    ; Push some values
    movi r3, #42
    push r3
    
    movi r4, #17
    push r4
    
    movi r5, #99
    push r5
    
    ; Pop them back (should be in reverse order)
    pop r6
    cmp r6, r5  ; Should be 99
    jne push_pop_fail
    
    pop r6
    cmp r6, r4  ; Should be 17
    jne push_pop_fail
    
    pop r6
    cmp r6, r3  ; Should be 42
    jne push_pop_fail
    
    jmp push_pop_pass
    
push_pop_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp push_pop_done
    
push_pop_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
push_pop_done:
    movi r1, #push_test
    movi r2, #9
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; Stack Operations Test
test_stack_ops:
    ; Test stack operations with function calls
    movi r3, #123
    movi r4, #45      ; Use smaller value to display correctly
    
    ; Call a function with parameters on stack
    push r3
    push r4
    call stack_function
    
    ; Result should be in r0
    movi r6, #168      ; 123 + 45
    cmp r0, r6
    jeq stack_ops_pass
    
stack_ops_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp stack_ops_done
    
stack_ops_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
stack_ops_done:
    movi r1, #stack_test
    movi r2, #10
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; Stack function - adds two parameters from stack
stack_function:
    ; Get return address
    pop r7
    
    ; Get parameters
    pop r8
    pop r9
    
    ; Add them
    add r0, r8, r9
    
    ; Restore return address and return
    push r7
    ret
