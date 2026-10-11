@extends('errors.layout')

@section('codigo', 'Erro 403')
@section('titulo', 'Sem acesso')
{{-- A explicação dada pelo sistema (ex.: "As notas de crédito estão desligadas"), se houver --}}
@section('mensagem', ($exception?->getMessage() ?: 'Não tem permissão para abrir esta página. Se acha que é um engano, fale com a LemServ.'))
