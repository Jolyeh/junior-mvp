import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
export interface SelectOption { value:string; label:string }
@Component({
 selector:'app-select', standalone:true,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SelectComponent),multi:true}],
 template:`<div class="select-root"><select [value]="value" [disabled]="disabled" [attr.aria-label]="placeholder()" [attr.aria-required]="required() || null" [attr.aria-invalid]="invalid() || null" [attr.aria-describedby]="invalid() ? describedBy() : null" (change)="choose($event)" (blur)="touched()"><option value="">{{placeholder()}}</option>@for(option of options(); track option.value){<option [value]="option.value">{{option.label}}</option>}</select><span aria-hidden="true" class="select-chevron"></span></div>`,
 styles:[`.select-root{position:relative;width:100%}.select-root select{width:100%;min-height:48px;appearance:none;border:1px solid #cdd6d8;background:#fff;border-radius:3px;color:#23384a;font-size:14px;font-weight:400;padding:0 38px 0 13px;cursor:pointer}.select-root select[aria-invalid=true]{border-color:#a9372b}.select-root select:focus-visible{outline:3px solid #185d38;outline-offset:2px}.select-root option{background:#fff;color:#23384a}.select-chevron{position:absolute;right:16px;top:19px;width:8px;height:8px;border-right:1.5px solid #425a69;border-bottom:1.5px solid #425a69;transform:rotate(45deg);pointer-events:none}@media(max-width:760px){.select-root select{font-size:16px}}`]
})
export class SelectComponent implements ControlValueAccessor {
 options=input<SelectOption[]>([]); placeholder=input('Sélectionner'); required=input(false); invalid=input(false); describedBy=input(''); value=''; disabled=false;
 private change:(v:string)=>void=()=>{}; touched:()=>void=()=>{};
 writeValue(v:string){this.value=v || '';} registerOnChange(fn:(v:string)=>void){this.change=fn;} registerOnTouched(fn:()=>void){this.touched=fn;} setDisabledState(disabled:boolean){this.disabled=disabled;}
 choose(event:Event){this.value=(event.target as HTMLSelectElement).value;this.change(this.value);}
}
