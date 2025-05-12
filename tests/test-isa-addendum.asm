; Test file for BURST ISA Addendum instructions
; This file tests all new instructions through assembly

; Test LIMM - Load 32-bit immediate
test_limm:
    limm r1, #0x12345678    ; Load full 32-bit value
    limm r2, #0xDEADBEEF    ; Another 32-bit value
    
; Test ENTER/LEAVE - Stack frame operations
test_stack_frame:
    movi r15, #0x1000       ; Set up frame pointer
    enter #8                ; Create frame with 8 words of locals
    movi r3, #42            ; Do some work in function
    movi r4, #84
    leave                   ; Clean up frame
    
; Test indirect control flow
test_indirect:
    limm r5, #func_target   ; Load function address
    calli r5                ; Call indirect
    limm r6, #jump_target   ; Load jump address
    jmpr r6                 ; Jump indirect
    movi r7, #0             ; This should be skipped
    jmp end_indirect

func_target:
    movi r8, #0x55          ; Function sets R8
    ret
    
jump_target:
    movi r7, #0x77          ; Jump target sets R7

end_indirect:

; Test rotate instructions
test_rotates:
    limm r1, #0x80000001    ; Test value with bits at ends
    movi r2, #1             ; Rotate count
    rol r3, r1, r2          ; Rotate left by 1
    ror r4, r1, r2          ; Rotate right by 1
    movi r2, #4             ; Rotate by 4
    rol r5, r1, r2          ; Rotate left by 4
    ror r6, r1, r2          ; Rotate right by 4
    
; Test arithmetic shift right
test_sar:
    limm r1, #0x80000000    ; Negative number
    movi r2, #1             ; Shift count
    sar r3, r1, r2          ; Arithmetic shift right
    movi r2, #4
    sar r4, r1, r2          ; Shift more
    limm r5, #0x40000000    ; Positive number
    sar r6, r5, r2          ; SAR on positive
    
; Test immediate arithmetic
test_immediate:
    movi r1, #100
    addi r2, r1, #50        ; Add positive immediate
    addi r3, r1, #-25       ; Add negative immediate
    addi r4, r1, #127       ; Max positive immediate
    addi r5, r1, #-128      ; Min negative immediate
    
; Test compare immediate
test_cmpi:
    movi r1, #50
    cmpi r1, #50            ; Equal
    movz r2, r1             ; Should move (zero flag set)
    cmpi r1, #60            ; Less than
    movlt r3, r1            ; Should move (less than)
    cmpi r1, #40            ; Greater than
    movgt r4, r1            ; Should move (greater than)
    
; Test trap instruction
test_trap:
    trap #5                 ; Call trap handler 5
    trap #10                ; Call trap handler 10
    
; Test all conditional moves
test_cond_moves:
    movi r1, #0xAA          ; Source value
    movi r2, #0xBB          ; Another source
    
    ; Set up different flag conditions
    movi r10, #0
    cmp r10, r10            ; Set zero flag
    movz r11, r1            ; Move if zero
    movnz r12, r2           ; Should not move
    
    movi r10, #5
    movi r13, #10
    cmp r10, r13            ; 5 < 10
    movlt r14, r1           ; Move if less than
    movge r15, r2           ; Should not move
    
    cmp r13, r10            ; 10 > 5
    movgt r3, r1            ; Move if greater than
    movle r4, r2            ; Should not move
    
    cmp r10, r10            ; Equal (set zero)
    movle r5, r1            ; Move if less or equal
    movge r6, r1            ; Move if greater or equal
    
    movc r7, r1             ; Unconditional move
    movne r8, r2            ; Should not move (zero flag set)
    
; Final halt
done:
    halt

.string "Test completed"
