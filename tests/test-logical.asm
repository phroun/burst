; BURST VM Logical Instruction Tests
; Tests AND, OR, XOR, NOT, SHL, SHR

main:
    jmp test_start

; Test data
test_name:      .string "=== Logical Tests ==="
pass_msg:       .string "PASS: "
fail_msg:       .string "FAIL: "
and_test:       .string "AND test"
or_test:        .string "OR test"
xor_test:       .string "XOR test"
not_test:       .string "NOT test"
shl_test:       .string "SHL test"
shr_test:       .string "SHR test"
newline:        .byte 10

test_start:
    ; Print test header
    movi r1, #test_name
    movi r2, #21
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall

    ; Test AND
    call test_and
    
    ; Test OR
    call test_or
    
    ; Test XOR
    call test_xor
    
    ; Test NOT
    call test_not
    
    ; Test SHL
    call test_shl
    
    ; Test SHR
    call test_shr
    
    halt

; AND Test
test_and:
    ; Test: 0b1100 AND 0b1010 = 0b1000 (12 AND 10 = 8)
    movi r3, #12    ; 0b1100
    movi r4, #10    ; 0b1010
    and r5, r3, r4
    
    movi r6, #8     ; 0b1000
    cmp r5, r6
    jeq and_pass
    
and_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp and_done
    
and_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
and_done:
    movi r1, #and_test
    movi r2, #8
    movi r0, #30
    syscall
    
    ; Print result
    movi r1, #32
    movi r0, #32
    syscall
    
    mov r1, r5
    movi r2, #48
    add r1, r1, r2
    movi r0, #32
    syscall
    
    movi r1, #10
    syscall
    ret

; OR Test
test_or:
    ; Test: 0b1100 OR 0b1010 = 0b1110 (12 OR 10 = 14)
    movi r3, #12    ; 0b1100
    movi r4, #10    ; 0b1010
    or r5, r3, r4
    
    movi r6, #14    ; 0b1110
    cmp r5, r6
    jeq or_pass
    
or_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp or_done
    
or_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
or_done:
    movi r1, #or_test
    movi r2, #7
    movi r0, #30
    syscall
    
    ; Print result (14 = '1' + '4')
    movi r1, #32
    movi r0, #32
    syscall
    
    movi r1, #49    ; '1'
    movi r0, #32
    syscall
    
    movi r1, #52    ; '4'
    movi r0, #32
    syscall
    
    movi r1, #10
    syscall
    ret

; XOR Test
test_xor:
    ; Test: 0b1100 XOR 0b1010 = 0b0110 (12 XOR 10 = 6)
    movi r3, #12    ; 0b1100
    movi r4, #10    ; 0b1010
    xor r5, r3, r4
    
    movi r6, #6     ; 0b0110
    cmp r5, r6
    jeq xor_pass
    
xor_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp xor_done
    
xor_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
xor_done:
    movi r1, #xor_test
    movi r2, #8
    movi r0, #30
    syscall
    
    ; Print result
    movi r1, #32
    movi r0, #32
    syscall
    
    mov r1, r5
    movi r2, #48
    add r1, r1, r2
    movi r0, #32
    syscall
    
    movi r1, #10
    syscall
    ret

; NOT Test
test_not:
    ; Test: NOT 0x0000000F = 0xFFFFFFF0
    ; For display, we'll check if lower bits become 0
    movi r3, #15    ; 0x0000000F
    not r3
    
    ; Check if lower 4 bits are now 0
    movi r4, #15
    and r5, r3, r4
    
    movi r6, #0
    cmp r5, r6
    jeq not_pass
    
not_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp not_done
    
not_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
not_done:
    movi r1, #not_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; SHL Test
test_shl:
    ; Test: 3 << 2 = 12
    movi r3, #3
    movi r4, #2
    shl r5, r3, r4
    
    movi r6, #12
    cmp r5, r6
    jeq shl_pass
    
shl_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp shl_done
    
shl_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
shl_done:
    movi r1, #shl_test
    movi r2, #8
    movi r0, #30
    syscall
    
    ; Print result
    movi r1, #32
    movi r0, #32
    syscall
    
    movi r1, #49    ; '1'
    movi r0, #32
    syscall
    
    movi r1, #50    ; '2'
    movi r0, #32
    syscall
    
    movi r1, #10
    syscall
    ret

; SHR Test
test_shr:
    ; Test: 12 >> 2 = 3
    movi r3, #12
    movi r4, #2
    shr r5, r3, r4
    
    movi r6, #3
    cmp r5, r6
    jeq shr_pass
    
shr_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp shr_done
    
shr_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
shr_done:
    movi r1, #shr_test
    movi r2, #8
    movi r0, #30
    syscall
    
    ; Print result
    movi r1, #32
    movi r0, #32
    syscall
    
    mov r1, r5
    movi r2, #48
    add r1, r1, r2
    movi r0, #32
    syscall
    
    movi r1, #10
    syscall
    ret
