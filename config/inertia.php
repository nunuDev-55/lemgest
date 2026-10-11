<?php

return [

    /*
    | Os testes confirmam que cada ecrã (componente React) existe no disco,
    | para apanhar páginas em falta ou com o nome errado.
    */

    'testing' => [
        'ensure_pages_exist' => true,
        'page_paths' => [resource_path('js/pages')],
        'page_extensions' => ['tsx', 'ts'],
    ],

];
